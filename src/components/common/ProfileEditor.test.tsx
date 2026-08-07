// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { render, fireEvent, act, cleanup, screen } from '@testing-library/react'
import { ProfileEditor } from './ProfileEditor'
import { useProfileStore } from '../../stores/profileStore'
import { makeProfile } from '../../test/syncFixtures'
import { ApiError } from '../../lib/api'
import type { Profile, UpdateProfileRequest } from '../../types/api'

type UpdateProfileMock = Mock<(changes: UpdateProfileRequest) => Promise<Profile>>

// makeProfile('kid-a') is name 'kid-a', icon 'cat', color 'garden-500'.
function signIn(updateProfile: UpdateProfileMock) {
  useProfileStore.setState({ currentProfile: makeProfile('kid-a'), updateProfile })
}

/** Clear the verify phase by picking the profile's real icon. */
function passVerify() {
  fireEvent.click(screen.getByRole('button', { name: 'cat' }))
}

describe('ProfileEditor', () => {
  let onClose: Mock<() => void>

  beforeEach(() => {
    onClose = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('stays on the verify phase and invites a retry after a wrong icon', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'owl' }))

    expect(screen.getByText("That's not your icon. Try again!")).toBeTruthy()
    expect(screen.queryByLabelText('Your name')).toBeNull()
  })

  it('advances to the form, prefilled, once the current icon is picked', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)

    passVerify()

    expect(screen.getByLabelText<HTMLInputElement>('Your name').value).toBe('kid-a')
  })

  it('saves the trimmed name with the picked icon and color', async () => {
    const updateProfile = vi.fn().mockResolvedValue(makeProfile('kid-a'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  Ada  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'owl' }))
    fireEvent.click(screen.getByRole('button', { name: 'sky-400' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(updateProfile).toHaveBeenCalledWith({
      currentIcon: 'cat',
      name: 'Ada',
      icon: 'owl',
      color: 'sky-400',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('disables saving until something actually changes', () => {
    signIn(vi.fn())
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    const save = screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } })

    expect(save.disabled).toBe(false)
  })

  it('keeps the child in the form and names the clash on a duplicate name', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new ApiError(409, 'Name already taken'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taken' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(screen.getByText('That name is already taken!')).toBeTruthy()
    expect(screen.getByLabelText('Your name')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('falls back to the verify phase when the server rejects the icon', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new ApiError(401, 'Incorrect icon'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    expect(screen.queryByLabelText('Your name')).toBeNull()
    expect(screen.getByText("That's not your icon. Try again!")).toBeTruthy()
  })

  it('accepts any icon at verify once a 401 has proven the cached one stale', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new ApiError(401, 'Incorrect icon'))
    signIn(updateProfile)
    render(<ProfileEditor onClose={onClose} />)
    passVerify()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    })

    // Back on verify with a stale currentProfile.icon ('cat'). Picking a
    // DIFFERENT icon — the real current one on another device — must advance
    // to the form rather than being rejected against the known-stale value.
    fireEvent.click(screen.getByRole('button', { name: 'owl' }))

    expect(screen.getByLabelText('Your name')).toBeTruthy()
    expect(screen.queryByText("That's not your icon. Try again!")).toBeNull()
  })
})
